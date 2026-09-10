using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Spamira.Api.Contracts;
using Spamira.Api.Models;

namespace Spamira.Api.Services;

public sealed class AccountConflictException : Exception
{
    public AccountConflictException() : base("An account could not be created with those details. Try signing in instead.") { }
}

public sealed class AccountService(UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn)
{
    public async Task<UserResponse> RegisterAsync(RegisterRequest request)
    {
        var name = request.DisplayName?.Trim();
        var email = request.Email?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 80) throw new ArgumentException("Enter a name between 1 and 80 characters.");
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || !new EmailAddressAttribute().IsValid(email))
            throw new ArgumentException("Enter a valid email address.");
        if (string.IsNullOrEmpty(request.Password) || request.Password.Length is < 10 or > 128
            || !request.Password.Any(char.IsUpper) || !request.Password.Any(char.IsLower) || !request.Password.Any(char.IsDigit))
            throw new ArgumentException("Use 10–128 characters with uppercase and lowercase letters and a number.");
        var user = new ApplicationUser { Id = Guid.NewGuid(), DisplayName = name, UserName = email, Email = email };
        IdentityResult result;
        try { result = await users.CreateAsync(user, request.Password); }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" }) { throw new AccountConflictException(); }
        if (!result.Succeeded)
        {
            if (result.Errors.Any(x => x.Code.StartsWith("Duplicate"))) throw new AccountConflictException();
            throw new ArgumentException("Please check your name, email, and password and try again.");
        }
        await signIn.SignInAsync(user, isPersistent: false);
        return UserResponse.From(user);
    }

    public async Task<UserResponse> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Length > 254 || string.IsNullOrEmpty(request.Password) || request.Password.Length > 128)
            throw new UnauthorizedAccessException("Email or password is incorrect.");
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null) throw new UnauthorizedAccessException("Email or password is incorrect.");
        var result = await signIn.PasswordSignInAsync(user, request.Password, request.RememberMe, lockoutOnFailure: true);
        if (!result.Succeeded) throw new UnauthorizedAccessException("Email or password is incorrect, or sign-in is temporarily locked. Please try again later.");
        return UserResponse.From(user);
    }

    public Task LogoutAsync() => signIn.SignOutAsync();
}

using System.Net;
using Spamira.Api.Services;
using Xunit;

namespace Spamira.Api.Tests;

public class MlClientTests
{
    private sealed class Handler(Func<HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(respond());
    }

    [Fact]
    public async Task UnsupportedTextIsValidationRatherThanDependencyFailure()
    {
        using var http = new HttpClient(new Handler(() => new(HttpStatusCode.UnprocessableEntity))) { BaseAddress = new("http://localhost/") };
        await Assert.ThrowsAsync<ArgumentException>(() => new MlClient(http).PredictAsync("12345", default));
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("not json")]
    [InlineData("{\"label\":\"spam\",\"confidence\":0.8,\"spam_probability\":0.8,\"legitimate_probability\":0.8,\"model_version\":\"v1\"}")]
    [InlineData("{\"label\":\"legitimate\",\"confidence\":0.8,\"spam_probability\":0.8,\"legitimate_probability\":0.2,\"model_version\":\"v1\"}")]
    public async Task RejectsMalformedPrediction(string body)
    {
        using var http = new HttpClient(new Handler(() => new(HttpStatusCode.OK) { Content = new StringContent(body) })) { BaseAddress = new("http://localhost/") };
        await Assert.ThrowsAsync<MlUnavailableException>(() => new MlClient(http).PredictAsync("hello", default));
    }

    [Fact]
    public async Task TimeoutBecomesUnavailable()
    {
        using var http = new HttpClient(new Handler(() => throw new TaskCanceledException())) { BaseAddress = new("http://localhost/") };
        await Assert.ThrowsAsync<MlUnavailableException>(() => new MlClient(http).PredictAsync("hello", default));
    }
}

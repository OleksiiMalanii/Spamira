using System.Net.Http.Json;
using System.Text.Json;

namespace Spamira.Api.Tests;

public static class AuthTestHelpers
{
    public static async Task<HttpResponseMessage> PostWithCsrfAsync<T>(this HttpClient client, string path, T body)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }
}

using System.Data.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Spamira.Api.Services;

namespace Spamira.Api.Infrastructure;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, detail) = exception switch
        {
            ArgumentException => (400, exception.Message),
            BadHttpRequestException => (400, "The request is invalid. Check the submitted values."),
            MlUnavailableException => (503, exception.Message),
            DbException or DbUpdateException => (503, "Message history is temporarily unavailable. Please try again."),
            _ => (500, "We could not complete your request. Please try again.")
        };
        logger.LogError(exception, "Request {TraceId} failed with status {Status}", context.TraceIdentifier, status);
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status, Title = status == 400 ? "Invalid request" : "Service unavailable",
            Detail = detail, Extensions = { ["traceId"] = context.TraceIdentifier }
        }, ct);
        return true;
    }
}

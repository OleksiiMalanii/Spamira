FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/Spamira.Api/Spamira.Api.csproj Spamira.Api/
RUN dotnet restore Spamira.Api/Spamira.Api.csproj
COPY backend/Spamira.Api/ Spamira.Api/
RUN dotnet publish Spamira.Api/Spamira.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s CMD curl --fail --silent http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["dotnet", "Spamira.Api.dll"]

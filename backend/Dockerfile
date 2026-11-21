# build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/Conecta.Api/Conecta.Api.csproj src/Conecta.Api/
RUN dotnet restore src/Conecta.Api/Conecta.Api.csproj
COPY src/ src/
RUN dotnet publish src/Conecta.Api/Conecta.Api.csproj -c Release -o /app --no-restore

# execucao
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "Conecta.Api.dll"]

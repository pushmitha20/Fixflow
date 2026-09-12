using assignment_service.Data;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;

Env.Load();

var builder = WebApplication.CreateBuilder(args);

var connectionString = Environment.GetEnvironmentVariable(
    "DATABASE_CONNECTION_STRING"
);

builder.Services.AddDbContext<AssignmentDbContext>(options =>
    options.UseNpgsql(connectionString)
);

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.Run();
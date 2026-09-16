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
builder.Services.AddSingleton<assignment_service.Kafka.KafkaProducerService>();
builder.Services.AddHostedService<assignment_service.Kafka.KafkaConsumerService>();

var app = builder.Build();

app.MapControllers();

app.Run();
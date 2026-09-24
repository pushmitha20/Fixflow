using System.Text.Json;
using Confluent.Kafka;
using assignment_service.Events;
using Microsoft.Extensions.DependencyInjection;

namespace assignment_service.Kafka;

public class KafkaConsumerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly KafkaProducerService _producer;
    private readonly ILogger<KafkaConsumerService> _logger;

    public KafkaConsumerService(
        IServiceScopeFactory scopeFactory,
        KafkaProducerService producer,
        ILogger<KafkaConsumerService> logger)
    {
        _scopeFactory = scopeFactory;
        _producer = producer;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        var bootstrapServers = Environment.GetEnvironmentVariable(
            "KAFKA_BOOTSTRAP_SERVERS"
        ) ?? "localhost:9092";

        var config = new ConsumerConfig
        {
            BootstrapServers = bootstrapServers,
            GroupId = "fixflow-assignment-service",
            AutoOffsetReset = AutoOffsetReset.Latest
        };

        KafkaSecurityConfig.Apply(config);

        using var consumer = new ConsumerBuilder<Ignore, string>(config)
            .Build();

        consumer.Subscribe("maintenance-events");

        while (!stoppingToken.IsCancellationRequested)
        {
            var result = consumer.Consume(stoppingToken);

            await HandleMessageAsync(
                result.Message.Value,
                result.TopicPartitionOffset.ToString(),
                stoppingToken
            );
        }
    }

    // One bad or unprocessable event is logged and skipped so it cannot stop the
    // consumer (or, via BackgroundService, the whole host). Shutdown still propagates.
    public async Task HandleMessageAsync(
        string messageValue,
        string source,
        CancellationToken stoppingToken)
    {
        try
        {
            await ProcessMessageAsync(messageValue, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to process maintenance event at {Source}; skipping it",
                source
            );
        }
    }

    private async Task ProcessMessageAsync(
        string messageValue,
        CancellationToken stoppingToken)
    {
        var eventData = JsonSerializer.Deserialize<MaintenanceRequestCreatedEvent>(
            messageValue,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }
        );

        if (eventData is not null)
        {
            Console.WriteLine(
                $"Maintenance request received: {eventData.RequestId}"
            );

            using var scope = _scopeFactory.CreateScope();

            var db = scope.ServiceProvider
                .GetRequiredService<assignment_service.Data.AssignmentDbContext>();

            var assignment = new assignment_service.Models.Assignment
            {
                MaintenanceRequestId = eventData.RequestId,
                TechnicianId = 1
            };

            db.Assignments.Add(assignment);

            await db.SaveChangesAsync(stoppingToken);

            Console.WriteLine(
                $"Assignment created: {assignment.Id}"
            );

            var assignedEvent = new MaintenanceRequestAssignedEvent
            {
                RequestId = eventData.RequestId,
                UserId = eventData.UserId,
                AssignmentId = assignment.Id,
                TechnicianId = assignment.TechnicianId
            };

            _producer.PublishAssignmentCreated(assignedEvent);

            Console.WriteLine(
                $"Assignment event published for request: {eventData.RequestId}"
            );
        }
    }
}

using System.Text.Json;
using Confluent.Kafka;
using assignment_service.Events;
using Microsoft.Extensions.DependencyInjection;

namespace assignment_service.Kafka;

public class KafkaConsumerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly KafkaProducerService _producer;

    public KafkaConsumerService(
        IServiceScopeFactory scopeFactory,
        KafkaProducerService producer)
    {
        _scopeFactory = scopeFactory;
        _producer = producer;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        var config = new ConsumerConfig
        {
            BootstrapServers = "localhost:9092",
            GroupId = "fixflow-assignment-service",
            AutoOffsetReset = AutoOffsetReset.Latest
        };

        using var consumer = new ConsumerBuilder<Ignore, string>(config)
            .Build();

        consumer.Subscribe("maintenance-events");

        while (!stoppingToken.IsCancellationRequested)
        {
            var result = consumer.Consume(stoppingToken);

            var eventData = JsonSerializer.Deserialize<MaintenanceRequestCreatedEvent>(
                result.Message.Value,
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
}
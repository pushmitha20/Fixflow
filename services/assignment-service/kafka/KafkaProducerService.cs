using System.Text.Json;
using Confluent.Kafka;
using assignment_service.Events;

namespace assignment_service.Kafka;

public class KafkaProducerService
{
    private readonly ProducerConfig _config = new()
    {
        BootstrapServers = "localhost:9092"
    };

    public void PublishAssignmentCreated(
        MaintenanceRequestAssignedEvent eventData)
    {
        using var producer = new ProducerBuilder<Null, string>(_config)
            .Build();

        var message = new Message<Null, string>
        {
            Value = JsonSerializer.Serialize(
                eventData,
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }
            )
        };

        producer.Produce(
            "assignment-events",
            message
        );

        producer.Flush(TimeSpan.FromSeconds(5));
    }
}
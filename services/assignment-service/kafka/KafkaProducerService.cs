using System.Text.Json;
using Confluent.Kafka;
using assignment_service.Events;

namespace assignment_service.Kafka;

public class KafkaProducerService
{
    private readonly ProducerConfig _config;

    public KafkaProducerService()
    {
        var bootstrapServers = Environment.GetEnvironmentVariable(
            "KAFKA_BOOTSTRAP_SERVERS"
        ) ?? "localhost:9092";

        _config = new ProducerConfig
        {
            BootstrapServers = bootstrapServers
        };
    }

    public virtual void PublishAssignmentCreated(
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
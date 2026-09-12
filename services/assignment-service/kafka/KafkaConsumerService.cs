using Confluent.Kafka;

namespace assignment_service.Kafka;

public class KafkaConsumerService : BackgroundService
{
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

            Console.WriteLine(
                $"Received event: {result.Message.Value}"
            );
        }
    }
}
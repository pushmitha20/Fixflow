using assignment_service.Data;
using assignment_service.Events;
using assignment_service.Kafka;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace assignment_service.Tests;

public class KafkaConsumerServiceTests
{
    private const string ValidEvent =
        "{\"eventType\":\"MaintenanceRequestCreated\",\"requestId\":56,\"userId\":53," +
        "\"location\":\"Integration Test Area\",\"priority\":\"MEDIUM\"}";

    private class RecordingProducer : KafkaProducerService
    {
        public List<MaintenanceRequestAssignedEvent> Published { get; } = new();

        public Func<Exception?> FailWith { get; set; } = () => null;

        public override void PublishAssignmentCreated(MaintenanceRequestAssignedEvent eventData)
        {
            var failure = FailWith();

            if (failure is not null)
            {
                throw failure;
            }

            Published.Add(eventData);
        }
    }

    private class RecordingLogger : ILogger<KafkaConsumerService>
    {
        public List<(LogLevel Level, string Message, Exception? Exception)> Entries { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add((logLevel, formatter(state, exception), exception));
        }
    }

    private static (KafkaConsumerService Service, ServiceProvider Provider) CreateService(
        RecordingProducer producer,
        RecordingLogger logger)
    {
        var databaseName = Guid.NewGuid().ToString();
        var provider = new ServiceCollection()
            .AddDbContext<AssignmentDbContext>(options => options.UseInMemoryDatabase(databaseName))
            .BuildServiceProvider();

        var service = new KafkaConsumerService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            producer,
            logger
        );

        return (service, provider);
    }

    private static List<Models.Assignment> Assignments(ServiceProvider provider)
    {
        using var scope = provider.CreateScope();

        return scope.ServiceProvider.GetRequiredService<AssignmentDbContext>().Assignments.ToList();
    }

    [Fact]
    public async Task HandleMessage_ValidEvent_CreatesOneAssignmentAndPublishesOneEvent()
    {
        var producer = new RecordingProducer();
        var logger = new RecordingLogger();
        var (service, provider) = CreateService(producer, logger);

        await service.HandleMessageAsync(ValidEvent, "maintenance-events [[0]] @42", CancellationToken.None);

        var assignment = Assert.Single(Assignments(provider));
        Assert.Equal(56, assignment.MaintenanceRequestId);
        Assert.Equal(1, assignment.TechnicianId);
        Assert.Equal("ASSIGNED", assignment.Status);

        var published = Assert.Single(producer.Published);
        Assert.Equal(56, published.RequestId);
        Assert.Equal(53, published.UserId);
        Assert.Equal(assignment.Id, published.AssignmentId);
        Assert.Equal(1, published.TechnicianId);
        Assert.DoesNotContain(logger.Entries, entry => entry.Level >= LogLevel.Error);
    }

    [Fact]
    public async Task HandleMessage_MalformedEvent_IsLoggedAndNextEventStillProcesses()
    {
        var producer = new RecordingProducer();
        var logger = new RecordingLogger();
        var (service, provider) = CreateService(producer, logger);

        await service.HandleMessageAsync("{not valid json", "maintenance-events [[0]] @41", CancellationToken.None);
        await service.HandleMessageAsync(ValidEvent, "maintenance-events [[0]] @42", CancellationToken.None);

        var error = Assert.Single(logger.Entries, entry => entry.Level == LogLevel.Error);
        Assert.Contains("maintenance-events [[0]] @41", error.Message);
        Assert.IsType<System.Text.Json.JsonException>(error.Exception);

        Assert.Equal(56, Assert.Single(Assignments(provider)).MaintenanceRequestId);
        Assert.Single(producer.Published);
    }

    [Fact]
    public async Task HandleMessage_ProcessingFailure_IsLoggedAndNextEventStillProcesses()
    {
        var producer = new RecordingProducer();
        var logger = new RecordingLogger();
        var (service, provider) = CreateService(producer, logger);
        var failNextPublish = true;
        producer.FailWith = () =>
        {
            if (!failNextPublish)
            {
                return null;
            }

            failNextPublish = false;
            return new InvalidOperationException("Broker unavailable");
        };

        await service.HandleMessageAsync(ValidEvent, "maintenance-events [[0]] @42", CancellationToken.None);
        await service.HandleMessageAsync(ValidEvent, "maintenance-events [[0]] @43", CancellationToken.None);

        var error = Assert.Single(logger.Entries, entry => entry.Level == LogLevel.Error);
        Assert.Contains("maintenance-events [[0]] @42", error.Message);
        Assert.IsType<InvalidOperationException>(error.Exception);
        Assert.Single(producer.Published);
    }

    [Fact]
    public async Task HandleMessage_ShutdownCancellation_IsRethrownNotLogged()
    {
        using var shutdown = new CancellationTokenSource();
        shutdown.Cancel();

        var producer = new RecordingProducer
        {
            FailWith = () => new OperationCanceledException(shutdown.Token)
        };
        var logger = new RecordingLogger();
        var (service, _) = CreateService(producer, logger);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => service.HandleMessageAsync(ValidEvent, "maintenance-events [[0]] @42", shutdown.Token)
        );

        Assert.DoesNotContain(logger.Entries, entry => entry.Level >= LogLevel.Error);
    }
}

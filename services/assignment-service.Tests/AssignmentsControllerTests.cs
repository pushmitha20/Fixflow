using assignment_service.Controllers;
using assignment_service.Data;
using assignment_service.Events;
using assignment_service.Kafka;
using assignment_service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace assignment_service.Tests;

public class AssignmentsControllerTests
{
    private class FakeKafkaProducerService : KafkaProducerService
    {
        public MaintenanceRequestAssignedEvent? PublishedEvent { get; private set; }

        public override void PublishAssignmentCreated(
            MaintenanceRequestAssignedEvent eventData)
        {
            PublishedEvent = eventData;
        }
    }

    private static AssignmentDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AssignmentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AssignmentDbContext(options);
    }

    [Fact]
    public async Task CreateAssignment_ReturnsAssignmentAndPersistsIt()
    {
        await using var db = CreateDbContext();
        var producer = new FakeKafkaProducerService();
        var controller = new AssignmentsController(db, producer);

        var request = new AssignmentCreateRequest
        {
            MaintenanceRequestId = 42,
            TechnicianId = 7,
            UserId = 99
        };

        var result = await controller.CreateAssignment(request);

        var ok = Assert.IsType<OkObjectResult>(result);
        var assignment = Assert.IsType<Assignment>(ok.Value);

        Assert.Equal(42, assignment.MaintenanceRequestId);
        Assert.Equal(7, assignment.TechnicianId);
        Assert.Equal("ASSIGNED", assignment.Status);
        Assert.NotEqual(default, assignment.AssignedAt);
        Assert.Equal(1, db.Assignments.Count());
        Assert.NotNull(producer.PublishedEvent);
        Assert.Equal(42, producer.PublishedEvent!.RequestId);
        Assert.Equal(99, producer.PublishedEvent.UserId);
        Assert.Equal(assignment.Id, producer.PublishedEvent.AssignmentId);
        Assert.Equal(7, producer.PublishedEvent.TechnicianId);
    }

    [Fact]
    public async Task GetAssignments_ReturnsAllAssignments()
    {
        await using var db = CreateDbContext();
        db.Assignments.AddRange(
            new Assignment
            {
                MaintenanceRequestId = 10,
                TechnicianId = 1,
                Status = "ASSIGNED"
            },
            new Assignment
            {
                MaintenanceRequestId = 11,
                TechnicianId = 2,
                Status = "ASSIGNED"
            }
        );
        await db.SaveChangesAsync();

        var controller = new AssignmentsController(db, new FakeKafkaProducerService());

        var result = await controller.GetAssignments();

        var ok = Assert.IsType<OkObjectResult>(result);
        var assignments = Assert.IsAssignableFrom<List<Assignment>>(ok.Value);

        Assert.Equal(2, assignments.Count);
        Assert.All(assignments, assignment => Assert.Equal("ASSIGNED", assignment.Status));
    }

    [Fact]
    public async Task CreateAssignment_UsesDefaultAssignmentState()
    {
        await using var db = CreateDbContext();
        var producer = new FakeKafkaProducerService();
        var controller = new AssignmentsController(db, producer);

        var request = new AssignmentCreateRequest
        {
            MaintenanceRequestId = 21,
            TechnicianId = 5,
            UserId = 42
        };

        var result = await controller.CreateAssignment(request);

        var ok = Assert.IsType<OkObjectResult>(result);
        var assignment = Assert.IsType<Assignment>(ok.Value);

        Assert.Equal("ASSIGNED", assignment.Status);
        Assert.True(assignment.AssignedAt > DateTime.UtcNow.AddMinutes(-1));
        Assert.NotNull(producer.PublishedEvent);
    }
}

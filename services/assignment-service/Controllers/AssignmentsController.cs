using assignment_service.Data;
using assignment_service.Events;
using assignment_service.Kafka;
using assignment_service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace assignment_service.Controllers;

[ApiController]
[Route("assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly AssignmentDbContext _db;
    private readonly KafkaProducerService _producer;

    public AssignmentsController(
        AssignmentDbContext db,
        KafkaProducerService producer)
    {
        _db = db;
        _producer = producer;
    }

    [HttpGet]
    public async Task<IActionResult> GetAssignments()
    {
        var assignments = await _db.Assignments.ToListAsync();

        return Ok(assignments);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAssignment(
        AssignmentCreateRequest request)
    {
        var assignment = new Assignment
        {
            MaintenanceRequestId = request.MaintenanceRequestId,
            TechnicianId = request.TechnicianId
        };

        _db.Assignments.Add(assignment);

        await _db.SaveChangesAsync();

        var assignedEvent = new MaintenanceRequestAssignedEvent
        {
            RequestId = assignment.MaintenanceRequestId,
            UserId = request.UserId,
            AssignmentId = assignment.Id,
            TechnicianId = assignment.TechnicianId
        };

        _producer.PublishAssignmentCreated(assignedEvent);

        return Ok(assignment);
    }
}


using assignment_service.Data;
using assignment_service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace assignment_service.Controllers;

[ApiController]
[Route("assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly AssignmentDbContext _db;

    public AssignmentsController(AssignmentDbContext db)
    {
        _db = db;
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

        return Ok(assignment);
    }
}


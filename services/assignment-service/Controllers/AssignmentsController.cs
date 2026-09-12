using assignment_service.Data;
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
}
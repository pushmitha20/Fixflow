namespace assignment_service.Models;

public class AssignmentCreateRequest
{
    public int MaintenanceRequestId { get; set; }

    public int TechnicianId { get; set; }

    public int UserId { get; set; }
}
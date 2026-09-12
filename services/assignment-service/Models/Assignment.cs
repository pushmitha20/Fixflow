namespace assignment_service.Models;

public class Assignment
{
    public int Id { get; set; }

    public int MaintenanceRequestId { get; set; }

    public int TechnicianId { get; set; }

    public string Status { get; set; } = "ASSIGNED";

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
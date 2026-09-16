namespace assignment_service.Events;

public class MaintenanceRequestAssignedEvent
{
    public string EventType { get; set; } = "MaintenanceRequestAssigned";
    public int RequestId { get; set; }
    public int UserId { get; set; }
    public int AssignmentId { get; set; }
    public int TechnicianId { get; set; }
}
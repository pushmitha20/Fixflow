namespace assignment_service.Events;

public class MaintenanceRequestCreatedEvent
{
    public string EventType { get; set; } = string.Empty;

    public int RequestId { get; set; }

    public string Location { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;
}
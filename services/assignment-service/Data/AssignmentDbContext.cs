using assignment_service.Models;
using Microsoft.EntityFrameworkCore;

namespace assignment_service.Data;

public class AssignmentDbContext : DbContext
{
    public AssignmentDbContext(DbContextOptions<AssignmentDbContext> options)
        : base(options)
    {
    }

    public DbSet<Assignment> Assignments { get; set; }
}
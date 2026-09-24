using assignment_service.Kafka;
using Confluent.Kafka;
using Xunit;

namespace assignment_service.Tests;

public class KafkaSecurityConfigTests
{
    private static readonly Dictionary<string, string> SaslSslEnvironment = new()
    {
        ["KAFKA_SECURITY_PROTOCOL"] = "SASL_SSL",
        ["KAFKA_SASL_MECHANISM"] = "SCRAM-SHA-256",
        ["KAFKA_SASL_USERNAME"] = "fixflow-user",
        ["KAFKA_SASL_PASSWORD"] = "not-a-real-password"
    };

    private static Func<string, string?> From(Dictionary<string, string> environment) =>
        name => environment.TryGetValue(name, out var value) ? value : null;

    [Fact]
    public void Apply_NoSecuritySettings_LeavesLocalPlaintextConfigUnchanged()
    {
        var config = new ConsumerConfig { BootstrapServers = "localhost:9092" };

        KafkaSecurityConfig.Apply(config, From(new Dictionary<string, string>()));

        Assert.Equal("localhost:9092", config.BootstrapServers);
        Assert.Null(config.Get("security.protocol"));
        Assert.Null(config.Get("sasl.mechanism"));
        Assert.Null(config.Get("ssl.ca.location"));
    }

    [Fact]
    public void Apply_SaslSslSettings_AreAppliedToProducerAndConsumerConfigs()
    {
        var environment = new Dictionary<string, string>(SaslSslEnvironment)
        {
            ["KAFKA_SSL_CA_LOCATION"] = "/etc/kafka/ca.pem"
        };

        foreach (ClientConfig config in new ClientConfig[] { new ConsumerConfig(), new ProducerConfig() })
        {
            KafkaSecurityConfig.Apply(config, From(environment));

            Assert.Equal(SecurityProtocol.SaslSsl, config.SecurityProtocol);
            Assert.Equal(SaslMechanism.ScramSha256, config.SaslMechanism);
            Assert.Equal("fixflow-user", config.SaslUsername);
            Assert.Equal("not-a-real-password", config.SaslPassword);
            Assert.Equal("/etc/kafka/ca.pem", config.SslCaLocation);
        }
    }

    [Fact]
    public void Apply_CaLocationIsOptional()
    {
        var config = new ProducerConfig();

        KafkaSecurityConfig.Apply(config, From(SaslSslEnvironment));

        Assert.Equal(SecurityProtocol.SaslSsl, config.SecurityProtocol);
        Assert.Null(config.SslCaLocation);
    }

    [Fact]
    public void Apply_IncompleteSaslSettings_ThrowWithoutRevealingThePassword()
    {
        var environment = new Dictionary<string, string>(SaslSslEnvironment)
        {
            ["KAFKA_SASL_USERNAME"] = ""
        };

        var error = Assert.Throws<InvalidOperationException>(
            () => KafkaSecurityConfig.Apply(new ConsumerConfig(), From(environment))
        );

        Assert.DoesNotContain("not-a-real-password", error.Message);
    }

    [Fact]
    public void Apply_SaslSettingsWithoutSecurityProtocol_Throw()
    {
        var environment = new Dictionary<string, string>(SaslSslEnvironment);
        environment.Remove("KAFKA_SECURITY_PROTOCOL");

        var error = Assert.Throws<InvalidOperationException>(
            () => KafkaSecurityConfig.Apply(new ConsumerConfig(), From(environment))
        );

        Assert.Contains("KAFKA_SECURITY_PROTOCOL", error.Message);
    }
}

using Confluent.Kafka;

namespace assignment_service.Kafka;

// Optional Kafka security settings shared by the consumer and producer. With
// KAFKA_SECURITY_PROTOCOL unset nothing is applied, so the local PLAINTEXT broker
// keeps working unchanged. Uses librdkafka property names so values match the
// Python services. Values are never logged.
public static class KafkaSecurityConfig
{
    public static void Apply(
        ClientConfig config,
        Func<string, string?>? getEnvironmentVariable = null)
    {
        getEnvironmentVariable ??= Environment.GetEnvironmentVariable;

        var protocol = getEnvironmentVariable("KAFKA_SECURITY_PROTOCOL")?.Trim();
        var mechanism = getEnvironmentVariable("KAFKA_SASL_MECHANISM")?.Trim();
        var username = getEnvironmentVariable("KAFKA_SASL_USERNAME");
        var password = getEnvironmentVariable("KAFKA_SASL_PASSWORD");
        var caLocation = getEnvironmentVariable("KAFKA_SSL_CA_LOCATION")?.Trim();

        if (string.IsNullOrEmpty(protocol))
        {
            if (!string.IsNullOrEmpty(mechanism)
                || !string.IsNullOrEmpty(username)
                || !string.IsNullOrEmpty(password))
            {
                throw new InvalidOperationException(
                    "Kafka SASL settings are set but KAFKA_SECURITY_PROTOCOL is not"
                );
            }

            return;
        }

        // Stored lowercase ("sasl_ssl"), the form Confluent.Kafka's typed
        // SecurityProtocol property writes and can read back.
        config.Set("security.protocol", protocol.ToLowerInvariant());

        if (protocol.StartsWith("SASL", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(mechanism)
                || string.IsNullOrEmpty(username)
                || string.IsNullOrEmpty(password))
            {
                throw new InvalidOperationException(
                    "KAFKA_SECURITY_PROTOCOL uses SASL but KAFKA_SASL_MECHANISM, "
                    + "KAFKA_SASL_USERNAME or KAFKA_SASL_PASSWORD is missing"
                );
            }

            config.Set("sasl.mechanism", mechanism);
            config.Set("sasl.username", username);
            config.Set("sasl.password", password);
        }

        if (!string.IsNullOrEmpty(caLocation))
        {
            config.Set("ssl.ca.location", caLocation);
        }
    }
}

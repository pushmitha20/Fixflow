import os


def kafka_security_config(environ=os.environ):
    # Optional Kafka security settings. With KAFKA_SECURITY_PROTOCOL unset the
    # result is empty, so the local PLAINTEXT broker keeps working unchanged.
    # Values are read only from the environment and never logged.
    protocol = environ.get("KAFKA_SECURITY_PROTOCOL", "").strip()
    mechanism = environ.get("KAFKA_SASL_MECHANISM", "").strip()
    username = environ.get("KAFKA_SASL_USERNAME", "")
    password = environ.get("KAFKA_SASL_PASSWORD", "")
    ca_location = environ.get("KAFKA_SSL_CA_LOCATION", "").strip()

    if not protocol:
        if mechanism or username or password:
            raise ValueError(
                "Kafka SASL settings are set but KAFKA_SECURITY_PROTOCOL is not"
            )
        return {}

    config = {"security.protocol": protocol}

    if protocol.upper().startswith("SASL"):
        if not (mechanism and username and password):
            raise ValueError(
                "KAFKA_SECURITY_PROTOCOL uses SASL but KAFKA_SASL_MECHANISM, "
                "KAFKA_SASL_USERNAME or KAFKA_SASL_PASSWORD is missing"
            )
        config.update({
            "sasl.mechanism": mechanism,
            "sasl.username": username,
            "sasl.password": password
        })

    if ca_location:
        config["ssl.ca.location"] = ca_location

    return config

import pytest

from app.kafka_config import kafka_security_config


SASL_SSL_ENV = {
    "KAFKA_SECURITY_PROTOCOL": "SASL_SSL",
    "KAFKA_SASL_MECHANISM": "SCRAM-SHA-256",
    "KAFKA_SASL_USERNAME": "fixflow-user",
    "KAFKA_SASL_PASSWORD": "not-a-real-password",
}


def test_no_security_settings_keeps_local_plaintext_config():
    assert kafka_security_config({}) == {}
    assert kafka_security_config({"KAFKA_SECURITY_PROTOCOL": "  "}) == {}


def test_sasl_ssl_settings_are_applied():
    config = kafka_security_config({
        **SASL_SSL_ENV,
        "KAFKA_SSL_CA_LOCATION": "/etc/kafka/ca.pem"
    })

    assert config == {
        "security.protocol": "SASL_SSL",
        "sasl.mechanism": "SCRAM-SHA-256",
        "sasl.username": "fixflow-user",
        "sasl.password": "not-a-real-password",
        "ssl.ca.location": "/etc/kafka/ca.pem"
    }


def test_ca_location_is_optional():
    assert "ssl.ca.location" not in kafka_security_config(SASL_SSL_ENV)


def test_incomplete_sasl_settings_fail_without_revealing_the_password():
    with pytest.raises(ValueError) as error:
        kafka_security_config({**SASL_SSL_ENV, "KAFKA_SASL_USERNAME": ""})

    assert "not-a-real-password" not in str(error.value)


def test_sasl_settings_without_security_protocol_fail():
    with pytest.raises(ValueError, match="KAFKA_SECURITY_PROTOCOL"):
        kafka_security_config({
            key: value for key, value in SASL_SSL_ENV.items()
            if key != "KAFKA_SECURITY_PROTOCOL"
        })

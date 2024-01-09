#!/bin/sh
curl --location --request PUT '{ip}' --header 'Accept: application/json' --data-raw '{
    "numberOfLights": 1,
    "lights": [
        {
            "on": 1,
            "brightness": 19,
            "temperature": 250
        }
    ]
}'


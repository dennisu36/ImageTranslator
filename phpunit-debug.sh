#!/bin/bash

export XDEBUG_CONFIG="idekey=netbeans-xdebug"
vendor/bin/phpunit $@


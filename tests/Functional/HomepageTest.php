<?php

namespace Tests\Functional;

class HomepageTest extends BaseTestCase
{

    /**
     * Test that the WIP translate route returns an expected string
     */
    public function testTranslateNotFinished()
    {
        $response = $this->runApp('GET', '/translate');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertContains('not finished', (string)$response->getBody());
    }
}
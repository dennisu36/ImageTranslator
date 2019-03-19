<?php

namespace Tests\Functional;

class RoutesTest extends BaseTestCase
{

    /**
     * Test that the homepage loaded and displays the right heading.
     */
    public function testHomepage()
    {
        $response = $this->runApp('GET', '/');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertContains("Image Translate", (string)$response->getBody());
    }


    /**
     * Test that the translate route works correctly.
     */
    public function testTranslateResponse()
    {
        $response = $this->runApp('POST', '/translate', ['translate' => []]);

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function testGoodResponse()
    {
        $response = $this->runApp('GET', '/good');
        $this->assertEquals(200, $response->getStatusCode());
    }
}
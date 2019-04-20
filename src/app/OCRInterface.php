<?php

namespace App;

interface OCRInterface
{
    public function getOCR($base64EncodedImage);
}

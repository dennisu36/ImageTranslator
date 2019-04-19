<?php

namespace App;

interface OCRInterface
{
    public function getTranslation($base64EncodedImage);
}

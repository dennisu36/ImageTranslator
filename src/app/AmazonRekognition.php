<?php

namespace App;

use App\OCRInterface;
use Aws\Rekognition\RekognitionClient;
use Aws\Exception\AwsException;

/**
 * Description of AmazonRekognition
 *
 * @author jaywalker
 */
class AmazonRekognition implements OCRInterface {
    public function getTranslation($base64EncodedImage) {
	$client = new Aws\Rekognition\RekognitionClient([
            'profile' => 'default',
            'region' => 'us-east-2',
            'version' => 'latest',
	]);

	$result = $client->detectText([
            'Image' => [ //instead of file_get_contents(image), you can put in the base64 string of the image and it will work the same.
                'Bytes' => base64_decode(file_get_contents($base64EncodedImage)),
            ],
	]);

	$textReceived = $result;
	//Rekognition gives you an array of lines and words and to make it not repeat it only prints it if it is a word, not a line of text.
	$count=0;
	for($n=0;$n<sizeOf($textReceived['TextDetections']); $n++){
            if($textReceived['TextDetections'][$n]['Type'] == 'LINE'){
                //print_r($textReceived['TextDetections'][$n]['DetectedText']);
                //print_r(" ");
                //combines the words into a new array starting at index 0.
                //old code to pass just the detected text down
                //$textToBePassed['TextDetections'][$count]['DetectedText'] = $textReceived['TextDetections'][$n]['DetectedText'];


                //Creates a new array that takes the detectedtext per line and the boundingbox paramaters and puts them into a new array...
                //...called $textToBePassed. This will be the array sent back to the client.
                $textToBePassed[$count] = [
                    "DetectedText" => $textReceived['TextDetections'][$n]['DetectedText'],
                    "BoundingBox" => $textReceived['TextDetections'][$n]['Geometry']['BoundingBox']
                ];
                $count++;
            }
	}
	return $textToBePassed;
    }
}

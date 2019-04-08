<?php

                require '../../vendor/autoload.php';
                use Aws\Rekognition\RekognitionClient;
                use Aws\Exception\AwsException;


$client = new Aws\Rekognition\RekognitionClient([
        'profile' => 'default',
        'region' => 'us-east-2',
        'version' => 'latest',
]);

$result = $client->detectText([
	'Image' => [ //instead of file_get_contents(image), you can put in the base64 string of the image and it will work the same.
		'Bytes' => file_get_contents("image9.jpg"),
	],
]);

$textReceived = $result;
//Rekognition gives you an array of lines and words and to make it not repeat it only prints it if it is a word, not a line of text.
$count=0;
for($n=0;$n<sizeOf($textReceived['TextDetections']); $n++){
	if($textReceived['TextDetections'][$n]['Type'] == 'WORD'){
		print_r($textReceived['TextDetections'][$n]['DetectedText']);
		print_r(" ");
		//combines the words into a new array starting at index 0.
		$textToBePassed['TextDetections'][$count] = $textReceived['TextDetections'][$n];
		$count++;
	}
}
//Testing that the array prints out right.
print_r($textToBePassed);

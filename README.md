# Image Translator Web Application

This is a web application that can be used to translate text on user-provided images. This repository contains the front-end and back-end code for the application. 

The front-end of the application is written in JavaScript and the backend is written in PHP using the [Slim3 PHP framework](http://www.slimframework.com)

## Install the Application

Run this command from the directory in which you want to install your new Slim Framework based application.

    php composer.phar install

* Point your virtual host document root to the application's `src/public/` directory.
* Ensure `logs/` is web writeable.

Run this command in the application directory to run the test suite

    php composer.phar test

That's it! 
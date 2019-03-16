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

## Team Git Workflow

When working on your assigned issues, please do not work directly on the master branch. Create a branch from master in the format 'initials-featurename' and work on your code there. Once your code is finished, push it to the remote repository (here on GitHub) and let me know that it's ready for review + merge. Here's an example:

Suppose I'm going to add a new button to the homepage. First I'll checkout the master branch, and pull from the remote to ensure I have the latest changes:

```
git checkout master
git pull origin master
```

Then I'll make a branch (and check it out) with my initials and a short feature title:

```
git checkout -b bf-new-button
```

Next I'll make my changes, commit them, and push my branch to the remote repository:

```
#assume I already made my changes
git add the-file-i-changed.html
git commit -m "I added the new button"
git push origin bf-new-button
```

Once you let me know you're done working on your branch, I'll review your code and merge it to the master branch.
#!/bin/bash

BRANCH=$1

git fetch origin
git checkout -b review/"$BRANCH" origin/main
git merge origin/"$BRANCH"

#!/bin/bash

# Firebase deployment script for Vanguard project
# This script deploys Firebase Storage and Firestore rules

echo "Deploying Firebase Storage rules..."
firebase deploy --only storage

echo "Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "Firebase rules deployment complete!"


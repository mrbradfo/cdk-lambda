#!bin/bash

IDX=1;

# Loop through arguments grab the profile argument and set the AWS_PROFILE variable
# for the SDK to use during deployment.
for arg in "$@"
do
  IDX=$(($IDX + 1));
  case $arg in
    --profile)
    aws_profile=${@:$IDX:1}
    ;;
  esac
done

#set this sessions AWS_PROFILE variable.
export AWS_PROFILE=$aws_profile;
echo "setting AWS_PROFILE to: $AWS_PROFILE";
echo "running: cdk $@";
npx cdk@2 $@
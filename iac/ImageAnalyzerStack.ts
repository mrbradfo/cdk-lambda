import cdk, { StackProps } from "aws-cdk-lib";
import s3 from "aws-cdk-lib/aws-s3";
import iam from "aws-cdk-lib/aws-iam";
import lambda from "aws-cdk-lib/aws-lambda";
import lambdaEventSource from "aws-cdk-lib/aws-lambda-event-sources";
import dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

const imageBucket = "cdk-rekn-imagebucket";

export interface ImageAnalyzerStackProps extends StackProps {
  stage: string;
  prefix: string;
}

class ImageAnalyzerStack extends cdk.Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope: Construct, id: string, props: ImageAnalyzerStackProps) {
    super(scope, id, props);

    // ========================================
    // Bucket for storing images
    // ========================================
    const bucket = new s3.Bucket(this, imageBucket, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "Bucket", { value: bucket.bucketName });

    // ========================================
    // Role for AWS Lambda
    // ========================================
    const role = new iam.Role(this, "cdk-rekn-lambdarole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rekognition:*", "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["*"],
      })
    );

    // ========================================
    // DynamoDB table for storing image labels
    // ========================================
    const table = new dynamodb.Table(this, "cdk-rekn-imagetable", {
      partitionKey: { name: "Image", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "Table", { value: table.tableName });

    // ========================================
    // AWS Lambda function
    // ========================================
    const lambdaFn = new lambda.Function(this, "cdk-rekn-function", {
      code: lambda.AssetCode.fromAsset("lambda"),
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "index.handler",
      role: role,
      environment: {
        TABLE: table.tableName,
        BUCKET: bucket.bucketName,
      },
    });
    lambdaFn.addEventSource(
      new lambdaEventSource.S3EventSource(bucket, {
        events: [s3.EventType.OBJECT_CREATED],
      })
    );

    bucket.grantReadWrite(lambdaFn);
    table.grantFullAccess(lambdaFn);
  }
}

export default ImageAnalyzerStack;

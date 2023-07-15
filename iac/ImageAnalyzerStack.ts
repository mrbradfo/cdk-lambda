import cdk, {
  App,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_dynamodb,
  aws_iam,
  aws_lambda,
  aws_lambda_event_sources,
  aws_s3,
} from "aws-cdk-lib";

const imageBucket = "cdk-rekn-imagebucket";

export interface ImageAnalyzerStackProps extends StackProps {
  stage: string;
  prefix: string;
}

class ImageAnalyzerStack extends Stack {
  /**
   *
   * @param {App} scope
   * @param {string} id
   * @param {StackProps} props
   */
  constructor(scope: App, id: string, props: ImageAnalyzerStackProps) {
    super(scope, id, props);

    // ========================================
    // Bucket for storing images
    // ========================================
    const bucket = new aws_s3.Bucket(this, imageBucket, {
      removalPolicy: RemovalPolicy.DESTROY,
    });
    new CfnOutput(this, "Bucket", { value: bucket.bucketName });

    // ========================================
    // Role for AWS Lambda
    // ========================================
    const role = new aws_iam.Role(this, "cdk-rekn-lambdarole", {
      assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        actions: ["rekognition:*", "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["*"],
      })
    );

    // ========================================
    // DynamoDB table for storing image labels
    // ========================================
    const table = new aws_dynamodb.Table(this, "cdk-rekn-imagetable", {
      partitionKey: { name: "Image", type: aws_dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    new CfnOutput(this, "Table", { value: table.tableName });

    // ========================================
    // AWS Lambda function
    // ========================================
    const lambdaFn = new aws_lambda.Function(this, "cdk-rekn-function", {
      code: aws_lambda.AssetCode.fromAsset("lambda"),
      runtime: aws_lambda.Runtime.PYTHON_3_9,
      handler: "index.handler",
      role: role,
      environment: {
        TABLE: table.tableName,
        BUCKET: bucket.bucketName,
      },
    });
    lambdaFn.addEventSource(
      new aws_lambda_event_sources.S3EventSource(bucket, {
        events: [aws_s3.EventType.OBJECT_CREATED],
      })
    );

    bucket.grantReadWrite(lambdaFn);
    table.grantFullAccess(lambdaFn);
  }
}

export default ImageAnalyzerStack;

#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import { context } from "../cdk.json";
import ImageAnalyzerStack, { ImageAnalyzerStackProps } from "../iac/ImageAnalyzerStack";

const app = new App({ context });
const ctx = (key: string): string | undefined => app.node.tryGetContext(key);

const stage = ctx("stage") || "dev";
const prefix = ctx("prefix");
const project = ctx("project") || "infrastructure";
const stackPrefix = `${stage}-${prefix ? `${prefix}-` : ""}`;
const appName = `${stackPrefix}${project}`;

try {
  // Validate context coming in
  if (!["dev", "test", "prod"].includes(stage || "")) {
    throw new Error(
      "The stage variable is required to build queues and buckets. e.g. dev, test, or prod. dev require and additional value under prefix."
    );
  }

  if (stage === "dev" && (prefix === undefined || prefix.length === 0)) {
    throw new Error(
      "If you are releasing to the dev stage you are require to give a prefix name, e.g. prefix=billy, etc."
    );
  }

  const props: ImageAnalyzerStackProps = {
    stage,
    prefix: stackPrefix,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  };

  const imageAnalyzerStack = new ImageAnalyzerStack(app, `${appName}-ImageAnalyzerStack`, props);

  Tags.of(imageAnalyzerStack).add("stage", stage);
  Tags.of(imageAnalyzerStack).add("project", project);
} catch (e) {
  console.error(e);
}

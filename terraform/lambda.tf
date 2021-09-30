locals {
  source_files    = fileset(path.module, "src/{*.js,lib/*.js,routes/*.js,package.json,package-lock.json}")
  source_sha      = sha1(join("", [for f in local.source_files : sha1(file(f))]))
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy" "basic_lambda_execution" {
  name = "AWSLambdaBasicExecutionRole"
}

resource "null_resource" "proxy_lambda_node_modules" {
  triggers = {
    source = local.source_sha
  }

  provisioner "local-exec" {
    command     = "npm install --production --no-bin-links && npm prune --production"
    working_dir = "${path.module}/../src"
  }
}

data "archive_file" "proxy_lambda" {
  depends_on    = [null_resource.proxy_lambda_node_modules]
  type          = "zip"
  source_dir    = "${path.module}/../src"
  output_path   = "${path.module}/package/${local.source_sha}.zip"
  excludes      = ["bin/*", "test/*"]
}

data "aws_iam_policy_document" "proxy_lambda_policy" {
  statement {
    effect    = "Allow"
    actions   = ["es:ESHttp*"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "proxy_lambda_policy" {
  name    = "${local.namespace}-dc-api-policy"
  policy  = data.aws_iam_policy_document.proxy_lambda_policy.json
  tags    = local.tags
}

resource "aws_iam_role" "proxy_lambda_role" {
  name                  = "${local.namespace}-dc-api-policy"
  assume_role_policy    = data.aws_iam_policy_document.lambda_assume_role.json
  tags                  = local.tags
}

resource "aws_iam_role_policy_attachment" "proxy_lambda_role_policy" {
  role          = aws_iam_role.proxy_lambda_role.name
  policy_arn    = aws_iam_policy.proxy_lambda_policy.arn
}

resource "aws_iam_role_policy_attachment" "basic_lambda_execution_policy" {
  role          = aws_iam_role.proxy_lambda_role.name
  policy_arn    = data.aws_iam_policy.basic_lambda_execution.arn
}

resource "aws_lambda_function" "proxy_lambda" {
  filename      = data.archive_file.proxy_lambda.output_path
  function_name = "${local.namespace}-dc-api"
  role          = aws_iam_role.proxy_lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs14.x"
  memory_size   = 128
  timeout       = 5
  publish       = true
  tags          = local.tags

  environment {
    variables = {
      UPSTREAM            = module.data_services.outputs.elasticsearch.endpoint
      API_TOKEN_SECRET    = local.secrets.api_token_secret
      NUSSO_API_KEY       = local.secrets.agentless_sso_key
      HONEYBADGER_API_KEY = local.secrets.honeybadger_api_key
      HONEYBADGER_ENV     = terraform.workspace
    }
  }
}

resource "aws_api_gateway_rest_api" "dc_api" {
  name          = "dc-api"
  description   = "Northwestern University Library Digital Collections API"
  tags          = local.tags

  body = templatefile(
    "${path.module}/api_definition.yml",
    {
      aws_region = data.aws_region.current.name
      lambda_arn = aws_lambda_function.proxy_lambda.arn
    }
  )
}

resource "aws_api_gateway_deployment" "dc_api" {
  rest_api_id   = aws_api_gateway_rest_api.dc_api.id

  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.dc_api.body))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "dc_api" {
  deployment_id = aws_api_gateway_deployment.dc_api.id
  rest_api_id   = aws_api_gateway_rest_api.dc_api.id
  stage_name    = "latest"
  tags          = local.tags
}

resource "aws_lambda_permission" "allow_api_gateway_invocation" {
  for_each      = toset(["*/*/*", "*/*/", "*/OPTIONS/*", "*/OPTIONS/"])
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proxy_lambda.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dc_api.execution_arn}/${each.key}"

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_acm_certificate" "api_gateway_certificate" {
  domain = join(".", [var.certificate_hostname, module.core.outputs.vpc.public_dns_zone.name])
}

resource "aws_api_gateway_domain_name" "dc_api" {
  domain_name       = join(".", [var.hostname, module.core.outputs.vpc.public_dns_zone.name])
  certificate_arn   = data.aws_acm_certificate.api_gateway_certificate.arn
  tags              = local.tags
}

resource "aws_api_gateway_base_path_mapping" "example" {
  api_id      = aws_api_gateway_rest_api.dc_api.id
  stage_name  = aws_api_gateway_stage.dc_api.stage_name
  domain_name = aws_api_gateway_domain_name.dc_api.domain_name
}

resource "aws_route53_record" "dc_api" {
  name    = aws_api_gateway_domain_name.dc_api.domain_name
  type    = "A"
  zone_id = module.core.outputs.vpc.public_dns_zone.id

  alias {
    evaluate_target_health = true
    name                   = aws_api_gateway_domain_name.dc_api.cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.dc_api.cloudfront_zone_id
  }
}

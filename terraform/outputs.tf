output "endpoint" {
  value = "https://${aws_api_gateway_domain_name.dc_api.domain_name}/"
}

output "api_gateway_stage_arn" {
  value = aws_api_gateway_stage.dc_api.arn
}

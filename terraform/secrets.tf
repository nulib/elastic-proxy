data "aws_region" "current" { }

locals {
  secrets = module.secrets.vars
  aws_region = data.aws_region.current.name
}

module "secrets" {
  source    = "git::https://github.com/nulib/infrastructure.git//modules/secrets"
  path      = "dcapi"
  defaults  = jsonencode({
    certificate_hostname      = "*"
    hostname                  = "dcapi"
    honeybadger_api_key       = ""
  })
}

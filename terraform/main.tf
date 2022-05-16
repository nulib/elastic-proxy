terraform {
  backend "s3" {
    key    = "dcapi.tfstate"
  }
}

provider "aws" { }

data "aws_region" "current" { }

locals {
  namespace             = module.core.outputs.stack.namespace
  tags                  = merge(
    module.core.outputs.stack.tags, 
    {
      Component = "dcapi"
      Git       = "github.com/nulib/elastic-proxy"
      Project   = "DC API"
    }
  )
}

module "core" {
  source = "git::https://github.com/nulib/infrastructure.git//modules/remote_state"
  component = "core"
}

module "data_services" {
  source = "git::https://github.com/nulib/infrastructure.git//modules/remote_state"
  component = "data_services"
}

variable "api_token_secret" {
  type    = string
}

variable "agentless_sso_key" {
  type    = string
}

variable "certificate_hostname" {
  type    = string
  default = "*"
}

variable "hostname" {
  type    = string
  default = "dcapi"
}

variable "honeybadger_api_key" {
  type    = string
  default = ""
}

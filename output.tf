output "alb_hostname" {
  value = aws_alb.main.dns_name
}
output "alb_zoneid" {
  value = aws_alb.main.zone_id
}
output "repository_url"{
  value = aws_ecr_repository.sortlog.repository_url
}


//route table for public subnet is necessary?  
###########create vpc and internet _gateway ############
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16" // private network range 
  tags = {
     Name = "${var.stack}-VPC-${var.app_env}"
   }
}

# resource "aws_vpc" "main" {
#   cidr_block = "10.0.0.0/16" // private network range 
#   tags = {
#      Name = "${var.stack}-VPC"
#   }

# }
###############Create public and private subnet#############
data "aws_availability_zones" "available" {
}
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.private_subnets, count.index) //have to in the range of vpc
  availability_zone = data.aws_availability_zones.available.names[count.index]
  count             = var.az_count
  tags = {
     Name = "${var.stack}-private subnet"
  }
}
 
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = element(var.public_subnets, count.index) //The IPv4 CIDR block for the subnet.
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  count                   = var.az_count
  tags = {
     Name = "${var.stack}-private subnet"
  }
  map_public_ip_on_launch = true //instance in public subnet will have public IP 
}
# Internet Gateway for the public subnet
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
     Name = "${var.stack}-internetGateway"
  }
}
##
# Route the public subnet traffic through the IGW // send all traffic to the internate gateway
resource "aws_route" "internet_access" {
  route_table_id         = aws_vpc.main.main_route_table_id
  destination_cidr_block = "0.0.0.0/0" // all 
  gateway_id             = aws_internet_gateway.main.id
}

###########Create a NAT gateway with an Elastic IP for each private subnet to get internet connectivity########################
resource "aws_eip" "gw" {
  count      = var.az_count
  vpc        = true
  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "gw" {
  count         = var.az_count
  subnet_id     = element(aws_subnet.public.*.id, count.index)
  allocation_id = element(aws_eip.gw.*.id, count.index)
  tags = {
     Name = "${var.stack}-NATsortlog"
  }
}

################ Create a new route table for the private subnets, make it route non-local traffic through the NAT gateway to the internet#############
resource "aws_route_table" "private" {
  count  = var.az_count
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = element(aws_nat_gateway.gw.*.id, count.index)
  }
  tags = {
     Name = "${var.stack}-privateRoutetablesortlog"
  }

}

#Explicitly associate the newly created route tables to the private subnets (so they don't default to the main route table)
resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = element(aws_subnet.private.*.id, count.index)
  route_table_id = element(aws_route_table.private.*.id, count.index)
}


#Set up security group 
#ALB Security Group: Edit to restrict access to the application
resource "aws_security_group" "lb" {
  name        = "load-balancer-security-group"
  description = "controls access to the ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
   protocol         = "tcp"
   from_port        = 80
   to_port          = 80
   cidr_blocks      = ["0.0.0.0/0"]
   ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
   protocol         = "tcp"
   from_port        = 443
   to_port          = 443
   cidr_blocks      = ["0.0.0.0/0"]
   ipv6_cidr_blocks = ["::/0"]
  }
  # ingress {
  #   protocol    = "tcp"
  #   from_port   = var.container_port
  #   to_port     = var.container_port
  #   cidr_blocks = ["0.0.0.0/0"]
  # }
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
     Name = "${var.stack}-sg"
  }
}
#Traffic to the ECS cluster should only come from the ALB
resource "aws_security_group" "ecs_tasks" {
  name   = "securitygroup_p20221024"
  vpc_id = aws_vpc.main.id
 
  ingress {
   protocol         = "tcp"
   from_port        = var.container_port
   to_port          = var.container_port //only one port 
   security_groups = [aws_security_group.lb.id]
  }
 
  egress {
   protocol         = "-1"
   from_port        = 0
   to_port          = 0
   cidr_blocks      = ["0.0.0.0/0"]
   ipv6_cidr_blocks = ["::/0"]
  }
}

################Create a load balancer #################
resource "aws_alb" "main" {
  name            = "load-balancer-demo"
  subnets         = aws_subnet.public.*.id
  security_groups = [aws_security_group.lb.id]
  load_balancer_type = "application"
  enable_deletion_protection = false
}

resource "aws_alb_target_group" "app" {
  name        = "target-group-demo"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = "3"
    interval            = "30"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "3"
    path                = var.health_check_path //route path / is alive or not 
    unhealthy_threshold = "2"
  }
}

# Redirect all traffic from the ALB to the target group alb listener 
resource "aws_alb_listener" "http" {
  load_balancer_arn = aws_alb.main.id
  port              = 80
  protocol          = "HTTP"
 
  default_action {
   type = "redirect"
 
   redirect {
     port        = 443
     protocol    = "HTTPS"
     status_code = "HTTP_301"
   }
  }
}
resource "aws_alb_listener" "back_end" {
  load_balancer_arn = aws_alb.main.id
  port              = 443
  protocol          = "HTTPS"
 
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:acm:ap-southeast-2:003374733998:certificate/5e991a42-cd1a-4b0f-b54c-76f8c5d89c50"
 
  default_action {
    target_group_arn = aws_alb_target_group.app.id
    type             = "forward"
  }
}

#############################ECS container service #############################
resource "aws_ecs_cluster" "main" {
  name = "test20221024"
}

resource "aws_ecs_task_definition" "main" {
  family                   = "demotask"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.fargate_cpu
  memory                   = var.fargate_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name        = "democontainer"
    image       = "${var.container_image}:latest"
    essential   = true
    environment= [
      {"name": "auth_encryption_salt", "value": "some-salt"},
      {"name": "PORT", "value"= "3000"}
    ]
    portMappings = [{
      protocol      = "tcp"
      containerPort = var.container_port
      hostPort      = var.container_port
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/demo-sortlog"
        awslogs-stream-prefix = "ecs"
        awslogs-region        = "ap-southeast-2"// change to your 
      }
    }
#     secrets = var.container_secrets
  }])

#   tags = {
#     Name        = "${var.name}-task-${var.environment}"
#     Environment = var.environment
#   }
}

resource "aws_ecs_service" "main" {
 name                               = "service"
 cluster                            = aws_ecs_cluster.main.id
 task_definition                    = aws_ecs_task_definition.main.arn
 desired_count                      = 2
 deployment_minimum_healthy_percent = 50
 deployment_maximum_percent         = 200
 launch_type                        = "FARGATE"
 scheduling_strategy                = "REPLICA"
 
 network_configuration {
   security_groups  = [aws_security_group.ecs_tasks.id]
   subnets          = aws_subnet.private.*.id
   assign_public_ip = false //false or true should be false, otherwise your task can be viewed via internet
 }
 
 load_balancer {
   target_group_arn = aws_alb_target_group.app.id
   container_name   = "democontainer"
   container_port   = var.container_port
 }
 
 depends_on = [aws_alb_listener.back_end, aws_iam_role_policy_attachment.ecs-task-execution-role-policy-attachment]
}

#IAM role for ECS 
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "demoapp-decsTaskExecutionRole"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}
resource "aws_iam_role" "ecs_task_role" {
  name = "demoapp-ecsTaskRole"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}
resource "aws_iam_role_policy_attachment" "ecs-task-execution-role-policy-attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

#IAM role for autoscaling 
resource "aws_iam_role" "ecs_auto_scale_role" {
  name               = "demoapp-ecs_auto_scale_role_name"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "application-autoscaling.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

# ECS auto scale role policy attachment
resource "aws_iam_role_policy_attachment" "ecs_auto_scale_role" {
  role       = aws_iam_role.ecs_auto_scale_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceAutoscaleRole"
}

# auto_scaling.tf
resource "aws_appautoscaling_target" "target" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  role_arn           = aws_iam_role.ecs_auto_scale_role.arn //
  min_capacity       = 1
  max_capacity       = 4
}
# Automatically scale capacity up by one

resource "aws_appautoscaling_policy" "up" {
  name               = "scale_up-demo"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.target.resource_id//"service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = aws_appautoscaling_target.target.scalable_dimension//"ecs:service:DesiredCount"

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_lower_bound = 0
      scaling_adjustment          = 1
    }
  }

}

# Automatically scale capacity down by one

resource "aws_appautoscaling_policy" "down" {
  name               = "scale_down-demo"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.target.resource_id//"service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = aws_appautoscaling_target.target.scalable_dimension//"ecs:service:DesiredCount"

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_lower_bound = 0
      scaling_adjustment          = -1
    }
  }
}

# CloudWatch alarm that triggers the autoscaling up policy
# resource "aws_cloudwatch_metric_alarm" "service_cpu_high" {
#   alarm_name          = "cpu_utilization_high"
#   comparison_operator = "GreaterThanOrEqualToThreshold"
#   evaluation_periods  = "2"
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/ECS"
#   period              = "60"
#   statistic           = "Average"
#   threshold           = "85"

#   dimensions = {
#     ClusterName = aws_ecs_cluster.main.name
#     ServiceName = aws_ecs_service.main.name
#   }

#   alarm_actions = [aws_appautoscaling_policy.up.arn]
# }

# CloudWatch alarm that triggers the autoscaling down policy
# resource "aws_cloudwatch_metric_alarm" "service_cpu_low" {
#   alarm_name          = "cb_cpu_utilization_low"
#   comparison_operator = "LessThanOrEqualToThreshold"
#   evaluation_periods  = "2"
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/ECS"
#   period              = "60"
#   statistic           = "Average"
#   threshold           = "10"

#   dimensions = {
#     ClusterName = aws_ecs_cluster.main.name
#     ServiceName = aws_ecs_service.main.name
#   }

#   alarm_actions = [aws_appautoscaling_policy.down.arn]
# }
# logs.tf

# Set up CloudWatch group and log stream and retain logs for 30 days
resource "aws_cloudwatch_log_group" "log_group" {
  name              = "/ecs/demo-sortlog"
  retention_in_days = 30

  tags = {
    Name = "demo-log-group"
  }
}

resource "aws_cloudwatch_log_stream" "log_stream" {
  name           = "demo-log-stream"
  log_group_name = aws_cloudwatch_log_group.log_group.name
}

# ############set up ECR #############
# data "aws_ecr_repository" "sortlog" {
#     name = "sortlog-ecs-terraform"
# }
#####Create ECR repo##########
resource "aws_ecr_repository" "sortlog" {
  name                 = "sortlog"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.sortlog.name
 
  policy = jsonencode({
   rules = [{
     rulePriority = 1
     description  = "keep last 10 images"
     action       = {
       type = "expire"
     }
     selection     = {
       tagStatus   = "any"
       countType   = "imageCountMoreThan"
       countNumber = 10
     }
   }]
  })
}

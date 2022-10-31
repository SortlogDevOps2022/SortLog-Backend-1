pipeline {
     agent any

    environment{
        CI ='true'
        AWS_CRED        = 'AWS_sortlog' //Change to yours
        AWS_REGION      = 'ap-southeast-2'
    }

    stages{
        stage('Install dependency')
        {
            steps{
             echo "Installing packages"
             sh 'yarn install'
             
             }
        }
        stage('yarn build') 
        {
            steps{
             sh "yarn build "
             sh 'ls -la ./dist'
            //  sh 'sudo rm -r ./data'
             }
        } 
        stage('Build Docker image') {
            steps {
                sh 'docker build -t sortlogback .'
                sh 'docker images --filter reference=sortlogback'
            }
        }
        stage('TF Launch Instances'){
            // Terraform must be installed
            // ssh key pairs must be configured:
            // sudo -i
            // su jenkins
            // ssh-keygen (press ENTER for passphrase)
            //传进去三个变量，这三个变量需要需要在terraform 中定义，所以有一个variable。tf 文件，只需要有一个描述
            steps {
                withAWS(credentials: AWS_CRED, region: AWS_REGION) {
                   
                    
                        sh '''
                            terraform init
                            terraform destroy \
                               -var="app_env=${APP_ENV}"\
                               --auto-approve
                        '''
                    
                }
            }
        }
        stage('Deliver for UAT') {
            when {
                branch 'Main'
            }

            steps {
                withAWS(credentials: AWS_CRED, region: AWS_REGION)        
               
                {
                    echo "deploy to ECR "
                    sh '''
                    docker tag sortlogback 003374733998.dkr.ecr.ap-southeast-2.amazonaws.com/sortlog-repository
                    docker login -u AWS -p $(aws ecr get-login-password --region ap-southeast-2) 003374733998.dkr.ecr.ap-southeast-2.amazonaws.com/sortlog-repository
                    docker push 003374733998.dkr.ecr.ap-southeast-2.amazonaws.com/sortlog-repository
                    '''}
             
            }
         
         }

    }
}

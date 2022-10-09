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
        // stage('Run Docker Container') 
        // {
        //     environment{MONGO_URL=credentials('MONGO_URL')}
        //     steps {
        //         sh 'docker-compose up '
        //     }
        //   }


        stage('upload backend to  ECR bucket') {
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

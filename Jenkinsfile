
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
             sh 'sudo npm install typescript -g'
             sh 'yarn install'
             
             }
        }
        stage('yarn build') 
        {
            steps{
             sh "yarn build "    
             sh 'ls -la ./dist'
             sh 'yarn start' 
            //  sh 'sudo rm -r ./data'
             }
        } 
        stage('Build Docker image') {
            steps {
                sh 'docker build -t sortlogback .'
                sh 'docker images --filter reference=sortlogback'
            }
        }      

    }
}

# Avaliação nativa do aplicativo – iOS e Android

Implementada em `src/storeReview.ts` usando `expo-store-review` para as APIs nativas da App Store e Google Play.

- Gatilho automático após o **encerramento confirmado** de um atendimento que o app observou na etapa de chat. Verifica o status `encerrado` no servidor, com paciente autenticado e app em primeiro plano.
- Sem perguntas ou filtro por satisfação/resultado clínico. O sistema operacional pode suprimir a solicitação; a API não revela se apareceu ou se houve avaliação.
- Intervalo mínimo de 90 dias **por paciente e por dispositivo**, persistido em `expo-secure-store`; registra tentativa, não avaliação efetiva.
- No Perfil, **Avaliar nosso aplicativo** abre a página de avaliação da loja respectiva. Esse botão não dispara diretamente o modal nativo, conforme a recomendação da Expo.
- Falhas no convite não bloqueiam a consulta ou navegação.

## Implantação

**Não usar OTA como primeira entrega**: `expo-store-review` é uma dependência nativa nova e não existe nos binários atualmente distribuídos. A próxima versão preparada no `app.json` é 1.0.4 (o EAS usa `appVersionSource: remote` e `autoIncrement` na build de produção). O buildNumber/versionCode são gerenciados remotamente pelo EAS.

1. Esta branch foi criada de `origin/main` em `d611abe` (com as correções de pagamento e triagem). Não compilar a partir da pasta `~/consultaja24h-app` desatualizada (148 commits atrás), que continha o commit inicial `4a617fe`.
2. Esta branch preserva o histórico atual e contém somente a integração de avaliações. **Não incluir `dist/` ou alterações do antigo diretório de trabalho em `src/components/ChatPaciente.tsx`**.
3. Criar builds das lojas: `eas build --platform ios --profile production` e `eas build --platform android --profile production`.
4. Testar em versões instaladas via App Store/Google Play; prompts de avaliação podem ser suprimidos pelas próprias lojas e normalmente não aparecem em TestFlight.
5. Depois de disponibilizar o novo binário, alterações somente na lógica JavaScript de frequência e gatilho poderão ser entregues via OTA para o runtime correspondente.

Verificações executadas nesta branch: `npx tsc --noEmit` e `CI=1 npx expo export --platform all --output-dir /tmp/cj-review-origin-main-export` (iOS e Android: sucesso).

## Melhoria posterior para runtime 1.0.4

- Tela discreta de atendimento finalizado, com acesso a documentos e retorno ao início, sem perguntar se o usuário gostou.
- Recuperação de convite ao retornar ao aplicativo: observa histórico de consultas encerradas **apenas quando não há atendimento ativo**, limita a janela às últimas 48 horas e estabelece um marco inicial para nunca ressuscitar convites de consultas anteriores à instalação. A API nativa confirma o status antes de solicitar.
- Essa melhoria é somente JavaScript, podendo ser entregue como EAS Update **exclusivamente para runtime 1.0.4**, que já inclui `expo-store-review` nas novas builds. Não será distribuída para runtimes 1.0.2/1.0.3.
- E-mail pós-consulta não faz parte da build móvel. Qualquer inclusão requer avaliação separada no backend, consentimento/comunicações aplicáveis e implantação própria; **não foi enviada comunicação a pacientes**.
